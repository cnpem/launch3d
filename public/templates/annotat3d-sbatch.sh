#!/bin/bash
# This template sript is used to run the Annotat3D Web container. The script will
# find an available port in a range and run the container with
# the Annotat3D app.
#
# There are two types of variables that need substitution on this template that are 
# replaced by the API before submitting the job to the scheduler.
# 1. ENV_ variables: These variables are replaced by the API with the values from the
#    environment variables of the application, defined in the .env file.
# 2. INPUT_ variables: These variables are replaced by the API with the values 
# submitted by the user.
# 
# The other variables are used by the script itself during the execution.

#SBATCH --partition=${INPUT_PARTITION}
#SBATCH --cpus-per-task=${INPUT_CPUS}
#SBATCH --job-name=${ENV_ANNOTAT3D_JOB_NAME}
#SBATCH --output=${ENV_ANNOTAT3D_LOG_OUT}
#SBATCH --error=${ENV_ANNOTAT3D_LOG_ERR}
#SBATCH --gres=gpu:${INPUT_GPUS}

export CONTAINER_PATH=${ENV_ANNOTAT3D_CONTAINER_PATH}
export PORT_RANGE0=${ENV_ANNOTAT3D_PORT_RANGE0}
export PORT_RANGE1=${ENV_ANNOTAT3D_PORT_RANGE1}


# Variable list to be passed to the container
INIT_IMAGE_PATH=${INPUT_IMAGE_PATH}
INIT_LABEL_PATH=${INPUT_LABEL_PATH}
INIT_ANNOTATION_PATH=${INPUT_ANNOTATION_PATH}
INIT_SUPERPIXEL_PATH=${INPUT_SUPERPIXEL_PATH}
INIT_OUTPUT_PATH=${INPUT_OUTPUT_PATH}

# Variable list to be passed to the container
RUNTIME_ENV_VARS=""
# If the variable is not empty, add it to the list
if [ ! -z "${INIT_IMAGE_PATH}" ]; then
    RUNTIME_ENV_VARS="${RUNTIME_ENV_VARS} -e INIT_IMAGE_PATH=${INIT_IMAGE_PATH}"
else 
    # If this variable is not set, throw an error
    echo "ERROR: INIT_IMAGE_PATH is required."
    exit 1
fi
if [ ! -z "${INIT_LABEL_PATH}" ]; then
    RUNTIME_ENV_VARS="${RUNTIME_ENV_VARS} -e INIT_LABEL_PATH=${INIT_LABEL_PATH}"
fi
if [ ! -z "${INIT_ANNOTATION_PATH}" ]; then
    RUNTIME_ENV_VARS="${RUNTIME_ENV_VARS} -e INIT_ANNOTATION_PATH=${INIT_ANNOTATION_PATH}"
fi
if [ ! -z "${INIT_SUPERPIXEL_PATH}" ]; then
    RUNTIME_ENV_VARS="${RUNTIME_ENV_VARS} -e INIT_SUPERPIXEL_PATH=${INIT_SUPERPIXEL_PATH}"
fi
if [ ! -z "${INIT_OUTPUT_PATH}" ]; then
    RUNTIME_ENV_VARS="${RUNTIME_ENV_VARS} -e INIT_OUTPUT_PATH=${INIT_OUTPUT_PATH}"
else 
    # If this variable is not set, throw an error
    echo "ERROR: INIT_OUTPUT_PATH is required."
    exit 1
fi
export RUNTIME_ENV_VARS

# Preventing errors when dealing with JSON and using pt_BR, since commas in floating-point
# numbers mess everything up.
export LC_ALL=en_US.UTF-8

# From: https://unix.stackexchange.com/questions/146756/forward-sigterm-to-child-in-bash
prep_signal() {
    unset child_pid
    unset kill_needed
    trap 'handle_signal' USR1 INT
}

handle_signal() {
    if [ "${child_pid}" ]; then
        echo "Handling signal ${child_pid}"

        kill -USR1 "${child_pid}" 2>/dev/null
    else
        echo "Kill needed"

        kill_needed="yes"
    fi
}

wait_signal() {
    child_pid=$!
    if [ "${kill_needed}" ]; then
        kill -USR1 "${child_pid}" 2>/dev/null
    fi
    echo "CHILD ${child_pid}"
    wait ${child_pid} 2>/dev/null
    trap - USR1 INT
    wait ${child_pid} 2>/dev/null
}

find_available_port() {
    local start_port=$1
    local end_port=$2

    if [[ -z "$start_port" || -z "$end_port" || "$start_port" -gt "$end_port" ]]; then
        return 1
    fi

    for ((port = start_port; port <= end_port; port++)); do
        if ! ss -tuln | grep -q ":$port "; then
            echo "$port"
            return 0
        fi
    done

    echo "ERROR: Failed to find an available port in the range $start_port-$end_port" >&2
    return 1
}

# returns the CUDA version if found, exit otherwise
check_cuda_version() {
    local CMD=""
    if [ $(command -v nvcc) ]; then
        CMD=nvcc
    elif [ -x /usr/local/cuda/bin/nvcc ]; then
        CMD=/usr/local/cuda/bin/nvcc
    fi

    local CUDA_VERSION_MAJOR=""
    if [[ $CMD != "" ]]; then
        CUDA_VERSION=$($CMD --version | grep "release" | awk '{print $6}' | cut -c2-)
        CUDA_VERSION_MAJOR=$(echo $CUDA_VERSION | cut -d. -f1)
    else
        echo "ERROR: Failed to find CUDA version."
        exit 1
    fi

    echo "CUDA version: $CUDA_VERSION_MAJOR"
    return 0
}

# check if singularity is installed
check_singularity() {
    if [ ! $(command -v singularity) ]; then
        echo "ERROR: Failed to find singularity command on host."
        exit 1
    fi
}

# check if image file exists
check_container_path() {
    local PATH=$1
    if [ ! -f "$PATH" ]; then
        echo "ERROR: Container file not found: $PATH"
        exit 1
    fi
}

run_container() {
    local CONTAINER_PATH=$1
    local HOST=$2
    local BIND_PORT=$3

    prep_signal

    singularity run --env "${RUNTIME_ENV_VARS}" --nv --app Annotat3D -B /ibira,/tmp,/dev/shm $CONTAINER_PATH -b "0.0.0.0:${BIND_PORT}" &
    echo ""
    echo "Access Annotat3D-web instance in http://${HOST}.lnls.br:${BIND_PORT}"

    SINGULARITY_PID=$!
    wait $SINGULARITY_PID
    SINGULARITY_EXIT_STATUS=$?

    if [ $SINGULARITY_EXIT_STATUS -ne 0 ]; then
        echo "Failed to run Annotat3D Web container."
        echo "ERROR: Singularity exited with status $SINGULARITY_EXIT_STATUS"
        exit $SINGULARITY_EXIT_STATUS
    fi

    wait_signal
}

main() {
    local HOST=$(hostname)

    # Hack to fix lib path on Ada
    if [ $(hostname) == "ada" ]; then
        echo "--- NOTE: Adding /usr/local/lib64 to fix issue with path on Ada (i.e., hack)"
        export LD_LIBRARY_PATH=/usr/local/lib64:$LD_LIBRARY_PATH
    fi

    check_cuda_version
    check_singularity
    check_container_path $CONTAINER_PATH

    local PORT=$(find_available_port $PORT_RANGE0 $PORT_RANGE1)

    run_container $CONTAINER_PATH $HOST $PORT
}

main
