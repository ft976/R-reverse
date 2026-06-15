# GReverse Web OSINT 🔍

An advanced AI-powered reverse image analysis and Open Source Intelligence (OSINT) tool designed for forensic investigations and visual data reconnaissance.

---

## ✨ Features 🚀

- **🖼️ Intelligent Image Analysis**: Upload images for deep-dive automated forensic analysis.
- **👁️ AI-Powered OSINT**: Leverage state-of-the-art models for text and visual data examination.
- **🚀 Advanced Model Support**: Seamlessly switch between cutting-edge models:
  - `kimi-k2.6` (Moonshot)
  - `nvidia/llama-3.1-nemotron-nano-vl-8b-v1`
- **🔬 Forensic Detail Extraction**: Thorough inspection of image meta-details (EXIF), micro-details (text, signs, landmarks), and contextual environmental analysis.
- **🛡️ Secure & Legal**: Built with compliance in mind. All automated tasks strictly adhere to legal guidelines and safety frameworks.

---

## 🛠️ Technology Stack 💻

The application is built for performance, security, and scalability:

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **AI Integrations**: Server-side proxies to NVIDIA NIM APIs and natively configured AI endpoints.
- **Image Processing**: Client-side optimized resizing and compression for fluid processing.

---

## ⚙️ Configuration & Setup 🔑

To run the application, ensure the following environment variables are configured in your `.env` file (based on `.env.example`):

| Variable | Description |
| :--- | :--- |
| `NVIDIA_API_KEY` | Required for accessing NIM-hosted models. |
| `KIMI_API_KEY` | Required for native Moonshot API access (fallback). |

---

## 💡 How to Use 📖

1. **Upload/Paste**: Use the interface to drag-and-drop or select the target image.
2. **Configure**: Select the desired forensic OSINT model (`Kimi` or `Nemotron`).
3. **Execute**: Initiate analysis to generate the forensic report.
4. **Review**: Examine the detailed findings, categorized and analyzed by our AI agents.

---

## ⚖️ Legal & Ethical Disclaimer 📜

This forensic OSINT / IMINT platform is designed exclusively for authorized, safe, and legal investigative research.

- **Compliant**: Operates under strict adherence to international and local privacy laws.
- **Authorized Use**: This tool should only be used by trained investigators for documented, legal research purposes.
- **Usage Policy**: The platform does not permit, encourage, or facilitate any form of illegal activity, privacy breaches, or unauthorized security bypasses. 

---
*Crafted with high-precision engineering for forensic excellence.*
