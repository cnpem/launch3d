# Annotat3D launcher

This is a simple launcher for the Annotat3D tool. It is meant to control user sessions
and to provide a simple interface to submit new Annotat3D jobs through the slurm scheduler.

# Usage

The use of the running instance of this tool is restricted to CNPEM internal network. 
One can access the tool by visiting the following URL:

[https://annotat3d.lnls.br](https://annotat3d.lnls.br)

But you can also run this tool locally by building the docker image and running it, provided that 
you have access to a similar infrastructure and properly configured the environment variables.
You can run the docker image with the following command:

```bash
docker compose up --build
```

# Development

This project was built using [Next.js](https://nextjs.org/).

## Installation

To install the project, you need to have Node.js installed. Then, you can run:

```bash
pnpm install
```

## Running the development server

To run the development server, you can run:

```bash
pnpm dev
```

This will start the development server on [http://localhost:3000](http://localhost:3000).

# License

This project is licensed under the GNU General Public License v3.0. You can find the full 
license text in the [LICENSE](LICENSE) file.
