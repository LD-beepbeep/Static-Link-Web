# Static Link Web 🚀

Bundle links, notes & files — share instantly with no fuss, no cloud, no accounts. Privacy-focused, and open source.


---

✨ Features

📦 Bundle anything: links, notes, pics

📶 Share instantly via QR code or small file

🔒 Free forever, no logins, no ads

🎨 Simple, clean, and beautiful UI

🤝 Open source and welcoming contributions

---

🤝 Contributing

Got ideas or fixes? Pull requests and issues are welcome!
Let’s keep it simple, powerful, and fun.


---

📄 License

MIT License — see the LICENSE file for details.

---

# Static Link Desktop

Built using [Nativefier](https://github.com/nativefier/nativefier).

---

## Features

- Loads the live website automatically
- Custom app name and icon
- Portable and easy to distribute
- Lightweight and simple for end users
- Available for **Windows** and **Linux**

---

## Download

Download the latest version from the [Releases](https://github.com/LD-beepbeep/Static-Link-Web/releases) page.

### Windows

1. Download the zip file from the latest release (look for `Static Link-win32-x64.zip`).
2. Extract the zip folder to any location on your PC.
3. Open the extracted folder.
4. Run `Static Link.exe`.

All required DLLs and files are included in the zip, so the app will work immediately after extraction.

### Linux

1. Download the Linux zip file from the latest release (look for `Static Link-linux-x64.zip`).
2. Extract the zip folder to any location.
3. Open the extracted folder.
4. Run `Static Link` (you may need to mark it as executable: `chmod +x Static\ Link`).

All required binaries and files are included in the zip, so the app will work immediately after extraction.

---

## Building from Source

If you want to rebuild the app yourself:

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Nativefier](https://github.com/nativefier/nativefier) installed globally:
  ```powershell
  npm install -g nativefier
  ```

### Build Command (Windows & Linux)

Open PowerShell or your terminal in the folder containing your icon and run:

#### Windows
```powershell
nativefier "https://ld-beepbeep.github.io/Static-Link-Web/" `
  --name "Static Link" `
  --icon "icon.ico" `
  --out "build" `
  --platform "windows"
```

#### Linux
```bash
nativefier "https://ld-beepbeep.github.io/Static-Link-Web/" \
  --name "Static Link" \
  --icon "icon.ico" \
  --out "build" \
  --platform "linux"
```

- `--name` → Sets the window title and app name
- `--icon` → Path to your `.ico` or `.png` file (Linux may require PNG)
- `--out` → Folder where the app will be built
- `--platform` → Target OS

After building, you will have a folder like:

```
build/Static Link-win32-x64
build/Static Link-linux-x64
```

Inside, you’ll see the executable along with all necessary files.

### Optional Build Script

For convenience, you can include a PowerShell script `build.ps1` (Windows) or a shell script `build.sh` (Linux):

#### build.ps1 (Windows)
```powershell
# build.ps1
nativefier "https://ld-beepbeep.github.io/Static-Link-Web/" `
  --name "Static Link" `
  --icon ".\icon.ico" `
  --out ".\build" `
  --platform "windows"
```

#### build.sh (Linux)
```bash
#!/bin/bash
nativefier "https://ld-beepbeep.github.io/Static-Link-Web/" \
  --name "Static Link" \
  --icon "./icon.png" \
  --out "./build" \
  --platform "linux"
```

---



## Notes for Users

- **Windows**: Runs on Windows 10/11. Must unzip the folder before launching `Static Link.exe`.
- **Linux**: Runs on most modern distributions. Must unzip and may need to mark as executable before launching.
- **Open source**: Source and build instructions are in the repo, but the release contains the compiled app.

---
