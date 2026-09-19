<div align="center">
    <img src="frontend/public/logo.png" width="120" style="border-radius: 24px;" alt="Scribe logo" />
    <h1>Scribe</h1>
    <h3>Privacy-First AI Meeting Assistant</h3>
    <p>Open Source • Privacy-First • Runs Entirely On Your Device</p>
</div>

---

A privacy-first AI meeting assistant that captures, transcribes, and summarizes meetings entirely on your own machine. No cloud, no accounts, no data leaving your device.

<details>
<summary>Table of Contents</summary>

- [Introduction](#introduction)
- [Why Scribe?](#why-scribe)
- [Features](#features)
- [Installation](#installation)
- [GPU Acceleration](#gpu-acceleration)
- [System Architecture](#system-architecture)
- [For Developers](#for-developers)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

</details>

## Introduction

Scribe is a privacy-first AI meeting assistant that runs entirely on your local machine. It captures your meetings, transcribes them in real time, and generates summaries — all without sending any data to the cloud. It's built for anyone who needs to keep sensitive conversations under their own control.

## Why Scribe?

- **Privacy First:** All processing happens locally on your device.
- **Cost-Effective:** Uses open-source AI models instead of expensive APIs.
- **Flexible:** Works offline and supports multiple meeting platforms.
- **Customizable:** Self-host and modify for your specific needs.

## Features

- **Local First:** All processing is done on your machine. No data ever leaves your computer.
- **Real-time Transcription:** Get a live transcript of your meeting as it happens, using **Whisper** or **Parakeet** models.
- **AI-Powered Summaries:** Generate meeting summaries with your choice of AI provider — **Ollama** (local), Claude, Groq, OpenRouter, or your own OpenAI-compatible endpoint.
- **Import & Enhance:** Import existing audio files to generate transcripts, or re-transcribe a recorded meeting with a different model or language — all processed locally.
- **Professional Audio Mixing:** Capture microphone and system audio simultaneously with intelligent ducking and clipping prevention.
- **Multi-Platform:** Works on macOS, Windows, and Linux.
- **Open Source:** Free to use, self-host, and modify.

## Installation

### 🪟 Windows

1. Download the latest `x64-setup.exe` from [Releases](https://github.com/Bobarinn/scribe/releases/latest)
2. Run the installer

> **Windows compatibility:** The packaged installer uses a Vulkan-enabled Whisper build. It requires an AVX2-capable x64 CPU; AVX-512 is not required. CUDA acceleration requires a source build configured with a compatible NVIDIA CUDA toolchain.

### 🍎 macOS

1. Download the latest `.dmg` from [Releases](https://github.com/Bobarinn/scribe/releases/latest)
2. Open the downloaded `.dmg` file
3. Drag **Scribe** to your Applications folder
4. Open **Scribe** from your Applications folder

### 🐧 Linux

Build from source following the detailed guides:

- [Building on Linux](docs/building_in_linux.md)
- [General Build Instructions](docs/BUILDING.md)

**Quick start:**

```bash
git clone https://github.com/Bobarinn/scribe
cd scribe/frontend
pnpm install --frozen-lockfile
./build-gpu.sh
```

## GPU Acceleration

Acceleration depends on the platform and build you use:

- **macOS packages:** Metal and CoreML are enabled automatically.
- **Windows packages:** Whisper is built with Vulkan support.
- **Linux:** Build from source with the acceleration configuration appropriate for your system.

CUDA is available through an appropriately configured NVIDIA source build; the standard Windows installer does not select it automatically.

## System Architecture

Scribe is a single, self-contained application built with [Tauri](https://tauri.app/). It uses a Rust-based core to handle all recording, transcription, and storage logic, with a Next.js frontend for the user interface.

For more details, see the [Architecture documentation](docs/architecture.md).

## For Developers

If you want to contribute to Scribe or build it from source, you'll need Rust and Node.js installed. For detailed build instructions, see the [Building from Source guide](docs/BUILDING.md).

## Contributing

Contributions are welcome! If you have questions or suggestions, please open an issue or submit a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - Feel free to use this project for your own purposes.

## Acknowledgments

Scribe is a fork of the open-source [Meetily](https://github.com/Zackriya-Solutions/meeting-minutes) project by Zackriya Solutions, repackaged and maintained by [Kolade Abobarin](https://github.com/Bobarinn/).

This project also builds on:

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [Screenpipe](https://github.com/mediar-ai/screenpipe)
- [transcribe-rs](https://crates.io/crates/transcribe-rs)
- **NVIDIA** for the **Parakeet** model
- [istupakov](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx) for the **ONNX conversion** of the Parakeet model
