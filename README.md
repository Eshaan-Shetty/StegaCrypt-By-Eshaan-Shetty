# StegaCrypt 🛡️

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

**StegaCrypt** is a powerful, client-side steganography utility designed to conceal secret messages inside ordinary images and PDF files. Built with strict privacy in mind, the application processes all data locally in the browser, ensuring your files and messages are never transmitted over the internet.

## ✨ Features
* **Image Steganography:** Hide secret messages within PNG and JPEG images using LSB (Least Significant Bit) encoding without visually altering the cover image.
* **PDF Steganography:** Embed hidden data safely behind the PDF `%%EOF` marker, keeping the original document fully readable and functional.
* **100% Client-Side Processing:** No servers, no databases, and no uploads. Completely offline functionality after the initial load.
* **Auto-Generated Keys:** Automatically generates strong, unique 16-character keys for every encoding session to secure hidden payloads.
* **Integrated Sharing:** One-click Gmail integration automatically drafts an email with your secure key and decoding instructions.
* **Interactive UI:** Features a responsive glassmorphism design with a dynamic cybersecurity particle network canvas background.

## 🚀 Installation & Usage

Since StegaCrypt is a fully browser-based application, no complex installation or local server is required.

1. Clone or download the repository to your local machine.
2. Open `splash.html` in any modern web browser.
3. Register/Login using the local authentication system.
4. Select either **Image Mode** or **PDF Mode** from the main dashboard.
5. **To Encode:** Upload a cover file, type your secret message, and click Encode. Save the generated key and download the encoded file.
6. **To Decode:** Upload the encoded file, enter the matching secret key, and click Decode to reveal the hidden message.

## 🛠️ Tech Stack
* **Frontend Structure:** HTML5
* **Styling & Animations:** CSS3 (Glassmorphism, CSS Variables, Keyframe Animations)
* **Logic & Encoding:** Vanilla JavaScript (Canvas API, FileReader API, Typed Arrays, DataViews)
* **Authentication:** Client-Side LocalStorage

## 👤 Author
**Eshaan Shetty**  
*MCA Mini Project — Cybersecurity & Digital Privacy*

## 📄 License
This project is open-source and available for educational and personal use.
