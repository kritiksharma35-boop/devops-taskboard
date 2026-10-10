# DevOps TaskBoard

A Dockerized full-stack task management application built to demonstrate practical DevOps and containerization skills.

## Tech Stack

- React + Vite
- Node.js + Express
- PostgreSQL
- Redis
- Nginx
- Docker and Docker Compose

## Architecture

Browser → Nginx → React Frontend  
Browser → Nginx → Node.js Backend → PostgreSQL and Redis

## Features

- Create and view tasks
- PostgreSQL persistent task storage
- Redis caching for faster task retrieval
- Nginx reverse proxy
- Docker Compose multi-container deployment
- Health checks for PostgreSQL and Redis
- Private Docker bridge network

## Live Demo

https://taskboard.yourdomain.com

## Run Locally

```bash
git clone https://github.com/kritiksharma35-boop/devops-taskboard.git
cd devops-taskboard
docker compose up --build -d


