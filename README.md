# SupportOps Dashboard (MVP)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow.svg)]()
[![Tech: Node.js](https://img.shields.io/badge/Tech-Node.js-blue.svg)]()

A minimal realtime SupportOps Dashboard — a single-server demo that serves a static frontend and broadcasts realtime ticket events using **Node.js**, **Express**, and **Socket.io**.

> Demo: realtime ticket feed + create new tickets from the browser.  
> Future: AI triage & suggested replies (planned).

---

## Demo / Quickstart

**Requirements**
- Node.js (LTS)
- npm
- A command line (PowerShell / Terminal)

**Run locally**
```bash
# clone (if not already)
git clone https://github.com/arslan-edgar/supportops-dashboard.git
cd supportops-dashboard

# install dependencies
npm install

# run in dev (auto-restarts on changes)
npm run dev
# or start normally
npm start
