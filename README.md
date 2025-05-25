# AWS EC2 Instance Manager UI

**AWS EC2 Instance Manager UI** is a lightweight, secure web-based interface for managing Amazon EC2 instances. It enables users to view instance summaries and perform basic operations such as **Start**, **Stop**, and **Terminate**, all without storing any user data.

## Features

- Real-time summary of EC2 instances
- Start, Stop, and Terminate EC2 instances
- Stateless design — no credentials or data are stored
- Built using HTML, CSS, and JavaScript (no frameworks)
- Runs locally via Live Server (e.g., Visual Studio Code extension)
- Docker support for containerized deployment
- CI/CD via GitHub Actions
- Licensed under the MIT License

## Prerequisites

To use the application, the following AWS credentials are required:

1. AWS Account ID  
2. AWS Access Key  
3. AWS Secret Key

> These credentials are used only in memory during the session. The application does not persist, transmit, or store any data.

## Getting Started

### Option 1: Run Locally with Live Server

1. Clone the repository:

   ```bash
   git clone https://github.com/dsrathore1/ec2-manager.git
   cd ec2-manager
````

2. Open the project folder in Visual Studio Code.

3. Right-click on `index.html` and select **"Open with Live Server"**.

4. The application will open in your browser at `http://127.0.0.1:5500/` (or similar).

### Option 2: Run via Docker

You can also run the application in a Docker container.

#### Build and Run Locally

```bash
docker build -t ec2-manager-ui .
docker run -p 3000:80 ec2-manager-ui
```

Access the app at: `http://localhost:5500`

#### Or Pull Prebuilt Image from GHCR

```bash
docker pull ghcr.io/dsrathore1/ec2-manager-ui:1.0
docker run -p 3000:80 ghcr.io/dsrathore1/ec2-manager-ui:1.0
```

## CI/CD with GitHub Actions

This project uses GitHub Actions to:

* Build and validate Docker images
* Publish images to GitHub Container Registry (`ghcr.io`)

CI configuration is available in `.github/workflows/`.

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software in accordance with the terms of the license.

## Author
Developed by **DS Rathore**
