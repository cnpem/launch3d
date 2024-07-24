export type StepStatus = "unknown" | "success" | "error";

export type InstanceSteps = {
  submit: StepStatus;
  start: StepStatus;
  finish: StepStatus;
};

// from slurm.h
// https://github.com/SchedMD/slurm/blob/d85e606f01acb846531e961d3ab319b35721690d/slurm/slurm.h#L262-L276
// /* last entry must be JOB_END, keep in sync with job_state_string and
//  *	job_state_string_compact. values may be ORed with JOB_STATE_FLAGS
//  *	below.  */
//  enum job_states {
// 	JOB_PENDING,		/* queued waiting for initiation */
// 	JOB_RUNNING,		/* allocated resources and executing */
// 	JOB_SUSPENDED,		/* allocated resources, execution suspended */
// 	JOB_COMPLETE,		/* completed execution successfully */
// 	JOB_CANCELLED,		/* cancelled by user */
// 	JOB_FAILED,		/* completed execution unsuccessfully */
// 	JOB_TIMEOUT,		/* terminated on reaching time limit */
// 	JOB_NODE_FAIL,		/* terminated on node failure */
// 	JOB_PREEMPTED,		/* terminated due to preemption */
// 	JOB_BOOT_FAIL,		/* terminated due to node boot failure */
// 	JOB_DEADLINE,		/* terminated on deadline */
// 	JOB_OOM,		/* experienced out of memory error */
// 	JOB_END			/* not a real state, last entry in table */
// };

export type JobStates =
  | "PENDING"
  | "RUNNING"
  | "SUSPENDED"
  | "COMPLETE"
  | "CANCELLED"
  | "FAILED"
  | "TIMEOUT"
  | "NODE_FAIL"
  | "PREEMPTED"
  | "BOOT_FAIL"
  | "DEADLINE"
  | "OOM"
  | "END";
