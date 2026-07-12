// ─── Constants ───────────────────────────────────────────────────────────────
const DELIMITER     = '\u0003\u0003\u0003EOF\u0003\u0003\u0003'; // non-printable fence
const KEY_SEPARATOR = '\u0004\u0004KEY\u0004\u0004';             // separates key from message

// ─── Current Mode ─────────────────────────────────────────────────────────────
// 'image' or 'pdf'
let currentMode = 'image';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showStatus(msg, type) {
    const el = document.getElementById('status');
    const icon = type === 'success' ? '✅' : '❌';
    el.innerHTML = `<div class="status-inner"><span class="status-icon">${icon}</span><span>${msg}</span></div>`;
    el.className = type;
}
function clearStatus() {
    const el = document.getElementById('status');
    el.innerHTML = '';
    el.className = '';
}

// ─── Toggle key input visibility (show/hide password) ────────────────────────
function toggleKeyVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// ─── Auto-generate Secret Key (XXXX-XXXX-XXXX-XXXX) ─────────────────────────
function generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const segments = [];
    for (let s = 0; s < 4; s++) {
        let seg = '';
        for (let i = 0; i < 4; i++) {
            seg += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(seg);
    }
    return segments.join('-');
}

// ─── Copy key to clipboard with visual feedback ──────────────────────────────
function copyKey(spanId, btn) {
    const text = document.getElementById(spanId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        // Fallback: select the text
        const range = document.createRange();
        range.selectNodeContents(document.getElementById(spanId));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        btn.innerHTML = '📌 Selected — Ctrl+C';
        setTimeout(() => { btn.innerHTML = '📋 Copy'; }, 2500);
    });
}

// ─── Stored encoded data for download / email ────────────────────────────────
let storedImageDataURL = null;
let storedImageFileName = '';
let storedImageKey = '';

let storedPDFBlob = null;
let storedPDFFileName = '';
let storedPDFKey = '';

// ─── Mode Switching (Image / PDF) ─────────────────────────────────────────────
function switchMode(mode) {
    currentMode = mode;
    document.getElementById('modeImage').classList.toggle('active', mode === 'image');
    document.getElementById('modePDF').classList.toggle('active', mode === 'pdf');
    document.getElementById('imageModeArea').style.display = mode === 'image' ? '' : 'none';
    document.getElementById('pdfModeArea').style.display   = mode === 'pdf'   ? '' : 'none';
    clearStatus();
    // reset active encode/decode tab to encode
    switchTab(currentEncodeDecodeTab);
}

// ─── Tab Switching (Encode / Decode) ─────────────────────────────────────────
let currentEncodeDecodeTab = 'encode';
function switchTab(tab) {
    currentEncodeDecodeTab = tab;

    // Image tabs
    document.getElementById('img-encodeSection').classList.toggle('active', tab === 'encode');
    document.getElementById('img-decodeSection').classList.toggle('active', tab === 'decode');

    // PDF tabs
    document.getElementById('pdf-encodeSection').classList.toggle('active', tab === 'encode');
    document.getElementById('pdf-decodeSection').classList.toggle('active', tab === 'decode');

    document.getElementById('tab-encode').classList.toggle('active', tab === 'encode');
    document.getElementById('tab-decode').classList.toggle('active', tab === 'decode');
    clearStatus();
}

// ─── File Drop Drag Styling ───────────────────────────────────────────────────
['encodeDropZone', 'decodeDropZone', 'pdfEncodeDropZone', 'pdfDecodeDropZone'].forEach(id => {
    const zone = document.getElementById(id);
    if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', () => zone.classList.remove('drag-over'));
});

// ─── Text ↔ Binary ───────────────────────────────────────────────────────────
function textToBin(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
        out += str.charCodeAt(i).toString(2).padStart(8, '0');
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMAGE STEGANOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Encode Image Selection ───────────────────────────────────────────────────
let encodeCapacityBits = 0;

function onEncodeImageChange() {
    const file = document.getElementById('encodeImage').files[0];
    if (!file) return;
    document.getElementById('encodeFileName').textContent = '📎 ' + file.name;
    document.getElementById('encodeFileName').style.display = 'block';

    const url = URL.createObjectURL(file);
    const preview = document.getElementById('encodePreview');
    preview.onload = () => {
        const img = preview;
        const c = document.getElementById('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const pixels = img.naturalWidth * img.naturalHeight;
        encodeCapacityBits = pixels * 3; // 3 channels per pixel, 1 bit each
        document.getElementById('capacityWrap').style.display = 'block';
        updateCapacity();
        URL.revokeObjectURL(url);
    };
    preview.src = url;
    document.getElementById('encodePreviewWrap').style.display = 'block';
}

function updateCapacity() {
    const text = document.getElementById('encodeText').value;
    document.getElementById('charCount').textContent = text.length + ' chars';
    if (!encodeCapacityBits) return;
    const msgBits = (text + DELIMITER).length * 8;
    const pct = Math.min(100, Math.round((msgBits / encodeCapacityBits) * 100));
    const bar = document.getElementById('capacityBar');
    bar.style.width = pct + '%';
    bar.className = 'capacity-bar' + (pct > 90 ? ' danger' : pct > 70 ? ' warn' : '');
    document.getElementById('capacityPct').textContent = pct + '%';
}

// ─── Decode Image Selection ───────────────────────────────────────────────────
function onDecodeImageChange() {
    const file = document.getElementById('decodeImage').files[0];
    if (!file) return;
    document.getElementById('decodeFileName').textContent = '📎 ' + file.name;
    document.getElementById('decodeFileName').style.display = 'block';
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('decodePreview');
    preview.src = url;
    preview.onload = () => URL.revokeObjectURL(url);
    document.getElementById('decodePreviewWrap').style.display = 'block';
    document.getElementById('decodeText').value = '';
    clearStatus();
}

// ─── ENCODE (Image) ──────────────────────────────────────────────────────────
function encode() {
    clearStatus();
    // Hide previous result panel
    document.getElementById('imgEncodeResult').classList.remove('visible');

    const fileInput = document.getElementById('encodeImage');
    const message   = document.getElementById('encodeText').value;

    if (!fileInput.files[0]) return showStatus('Please select a cover image.', 'error');
    if (!message.trim())     return showStatus('Please enter a secret message.', 'error');

    // Auto-generate the key
    const key = generateKey();

    // Payload format:  <KEY><KEY_SEPARATOR><message><DELIMITER>
    const payload = key + KEY_SEPARATOR + message + DELIMITER;
    const binMsg  = textToBin(payload);

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const maxBits = Math.floor(data.length / 4) * 3;
            if (binMsg.length > maxBits) {
                return showStatus('Image is too small for this message. Use a larger image.', 'error');
            }

            let bitIdx = 0;
            for (let i = 0; i < data.length && bitIdx < binMsg.length; i++) {
                if ((i % 4) === 3) continue;
                data[i] = (data[i] & 0xFE) | parseInt(binMsg[bitIdx], 10);
                bitIdx++;
            }

            ctx.putImageData(imageData, 0, 0);

            // Store encoded data for later download
            storedImageDataURL  = canvas.toDataURL('image/png');
            storedImageFileName = 'encoded_' + (fileInput.files[0].name.replace(/\.\w+$/, '') || 'image') + '.png';
            storedImageKey      = key;

            // Show the result panel
            document.getElementById('imgGeneratedKey').textContent = key;
            document.getElementById('imgEncodeResult').classList.add('visible');

            showStatus('Message encoded successfully! Download the image and share the key.', 'success');
            document.getElementById('encodeBtn').textContent = '🔒  Encode Again';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(fileInput.files[0]);
}

// ─── Download Encoded Image ──────────────────────────────────────────────────
function downloadEncodedImage() {
    if (!storedImageDataURL) return showStatus('No encoded image available. Please encode first.', 'error');
    const link = document.createElement('a');
    link.download = storedImageFileName;
    link.href     = storedImageDataURL;
    link.click();
    showStatus('Encoded image downloaded! Don\'t forget to share the key with the receiver.', 'success');
}

// ─── Send Image Key via Gmail ────────────────────────────────────────────────
function sendImageViaGmail() {
    const email = document.getElementById('imgReceiverEmail').value.trim();
    if (!email) return showStatus('Please enter the receiver\'s email address.', 'error');
    if (!storedImageKey) return showStatus('No key available. Please encode first.', 'error');

    const subject = encodeURIComponent('🔐 Steganography — Your Secret Key');
    const body = encodeURIComponent(
        'Hi,\n\n' +
        'I\'ve sent you an encoded image with a hidden message inside.\n\n' +
        '🔑 Your Secret Key:\n' +
        storedImageKey + '\n\n' +
        '📋 How to decode:\n' +
        '1. Open the Steganography Tool\n' +
        '2. Switch to the "Decode" tab\n' +
        '3. Upload the encoded PNG image I\'ve attached\n' +
        '4. Enter the secret key above\n' +
        '5. Click "Decode" to reveal the hidden message\n\n' +
        '⚠️ Important: Use the exact PNG file attached. Screenshots or re-saved images won\'t work.\n\n' +
        '— Sent via Steganography Tool'
    );

    const gmailURL = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
    window.open(gmailURL, '_blank');
    showStatus('Gmail compose window opened! Attach the encoded image and hit Send.', 'success');
}

// ─── DECODE (Image) ──────────────────────────────────────────────────────────
function decode() {
    clearStatus();
    document.getElementById('decodeText').value = '';
    const fileInput = document.getElementById('decodeImage');
    const enteredKey = document.getElementById('decodeKey').value;

    if (!fileInput.files[0]) return showStatus('Please select an encoded PNG image.', 'error');
    if (!enteredKey.trim())  return showStatus('Please enter the Secret Key to unlock the message.', 'error');

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let bits = '';
            let result = '';
            const delim = DELIMITER;

            for (let i = 0; i < data.length; i++) {
                if ((i % 4) === 3) continue;

                bits += (data[i] & 1).toString();

                if (bits.length === 8) {
                    const code = parseInt(bits, 2);
                    bits = '';
                    result += String.fromCharCode(code);

                    if (result.length >= delim.length && result.endsWith(delim)) {
                        const full = result.slice(0, -delim.length);

                        // ── Key verification ─────────────────────────────
                        const sepIdx = full.indexOf(KEY_SEPARATOR);
                        if (sepIdx === -1) {
                            // Old encoded image (no key embedded) — block it
                            return showStatus('❌ This image has no key protection. It may have been encoded without a key.', 'error');
                        }
                        const storedKey = full.slice(0, sepIdx);
                        const message   = full.slice(sepIdx + KEY_SEPARATOR.length);

                        if (storedKey !== enteredKey) {
                            return showStatus('🔐 Wrong Secret Key! Access denied.', 'error');
                        }
                        // ─────────────────────────────────────────────────

                        document.getElementById('decodeText').value = message;
                        return showStatus(
                            message.length > 0
                                ? '✅ Hidden message extracted successfully!'
                                : 'Image decoded but message is empty.',
                            'success'
                        );
                    }
                }
            }

            document.getElementById('decodeText').value = '';
            showStatus('No hidden message found. Make sure you are using the original encoded PNG.', 'error');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(fileInput.files[0]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PDF STEGANOGRAPHY
//  Strategy: Append the binary-encoded message bits after the PDF %%EOF marker.
//  The PDF remains valid and openable; the extra bytes are ignored by viewers.
//  We prepend a magic header so we can locate our data during decode.
// ═══════════════════════════════════════════════════════════════════════════════

const PDF_MAGIC = '\x00STEG\x01'; // 6-byte magic header before payload bits

// ─── PDF Encode File Selection ────────────────────────────────────────────────
function onEncodePDFChange() {
    const file = document.getElementById('encodePDF').files[0];
    if (!file) return;
    document.getElementById('pdfEncodeFileName').textContent = '📎 ' + file.name;
    document.getElementById('pdfEncodeFileName').style.display = 'block';

    // Estimate capacity: ~1 bit per byte available in PDF body, rough max
    const maxChars = Math.floor(file.size / 8);
    document.getElementById('pdfCapacityNote').textContent =
        `PDF size: ${(file.size / 1024).toFixed(1)} KB — can store up to ~${maxChars.toLocaleString()} characters`;
    document.getElementById('pdfCapacityNote').style.display = 'block';

    document.getElementById('pdfEncodeMsg').value = '';
    document.getElementById('pdfCharCount').textContent = '0 chars';
    clearStatus();
}

function updatePDFCapacity() {
    const text = document.getElementById('pdfEncodeMsg').value;
    document.getElementById('pdfCharCount').textContent = text.length + ' chars';
}

// ─── PDF Decode File Selection ────────────────────────────────────────────────
function onDecodePDFChange() {
    const file = document.getElementById('decodePDF').files[0];
    if (!file) return;
    document.getElementById('pdfDecodeFileName').textContent = '📎 ' + file.name;
    document.getElementById('pdfDecodeFileName').style.display = 'block';
    document.getElementById('pdfDecodeText').value = '';
    clearStatus();
}

// ─── ENCODE (PDF) ─────────────────────────────────────────────────────────────
function encodePDF() {
    clearStatus();
    // Hide previous result panel
    document.getElementById('pdfEncodeResult').classList.remove('visible');

    const fileInput = document.getElementById('encodePDF');
    const message   = document.getElementById('pdfEncodeMsg').value;

    if (!fileInput.files[0]) return showStatus('Please select a cover PDF file.', 'error');
    if (!message.trim())     return showStatus('Please enter a secret message.', 'error');

    // Auto-generate the key
    const key = generateKey();

    const reader = new FileReader();
    reader.onload = function (e) {
        // Original PDF bytes
        const originalBytes = new Uint8Array(e.target.result);

        // Build the payload string: magic + key + KEY_SEPARATOR + message + delimiter
        const payload = PDF_MAGIC + key + KEY_SEPARATOR + message + DELIMITER;

        // Encode payload length as 4-byte big-endian header so decode is fast
        const payloadBin = textToBin(payload); // binary string of 0s and 1s
        const bitCount   = payloadBin.length;

        // Pack bits into bytes (8 bits → 1 byte) for compact storage
        const packedLen  = Math.ceil(bitCount / 8);
        const packed     = new Uint8Array(packedLen);
        for (let i = 0; i < bitCount; i++) {
            if (payloadBin[i] === '1') {
                packed[i >> 3] |= (0x80 >> (i & 7));
            }
        }

        // Length header: 4 bytes big-endian = number of BITS stored
        const header = new Uint8Array(4);
        const dv = new DataView(header.buffer);
        dv.setUint32(0, bitCount, false);

        // Combine: [original PDF] + [0x00 separator] + [4-byte bit-count] + [packed bits]
        const separator = new Uint8Array([0x00]);
        const combined  = new Uint8Array(
            originalBytes.length + separator.length + header.length + packed.length
        );
        combined.set(originalBytes, 0);
        combined.set(separator,    originalBytes.length);
        combined.set(header,       originalBytes.length + separator.length);
        combined.set(packed,       originalBytes.length + separator.length + header.length);

        // Store encoded PDF for later download
        storedPDFBlob     = new Blob([combined], { type: 'application/pdf' });
        storedPDFFileName = 'encoded_' + (fileInput.files[0].name.replace(/\.pdf$/i, '') || 'document') + '.pdf';
        storedPDFKey      = key;

        // Show the result panel
        document.getElementById('pdfGeneratedKey').textContent = key;
        document.getElementById('pdfEncodeResult').classList.add('visible');

        showStatus(
            `Message hidden in PDF successfully! Download the file and share the key. (Added ${(packed.length / 1024).toFixed(2)} KB)`,
            'success'
        );
        document.getElementById('pdfEncodeBtn').textContent = '📄 Encode Again';
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

// ─── Download Encoded PDF ────────────────────────────────────────────────────
function downloadEncodedPDF() {
    if (!storedPDFBlob) return showStatus('No encoded PDF available. Please encode first.', 'error');
    const url  = URL.createObjectURL(storedPDFBlob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = storedPDFFileName;
    link.click();
    URL.revokeObjectURL(url);
    showStatus('Encoded PDF downloaded! Don\'t forget to share the key with the receiver.', 'success');
}

// ─── Send PDF Key via Gmail ──────────────────────────────────────────────────
function sendPDFViaGmail() {
    const email = document.getElementById('pdfReceiverEmail').value.trim();
    if (!email) return showStatus('Please enter the receiver\'s email address.', 'error');
    if (!storedPDFKey) return showStatus('No key available. Please encode first.', 'error');

    const subject = encodeURIComponent('🔐 Steganography — Your Secret Key');
    const body = encodeURIComponent(
        'Hi,\n\n' +
        'I\'ve sent you an encoded PDF with a hidden message inside.\n\n' +
        '🔑 Your Secret Key:\n' +
        storedPDFKey + '\n\n' +
        '📋 How to decode:\n' +
        '1. Open the Steganography Tool\n' +
        '2. Switch to PDF Mode, then the "Decode" tab\n' +
        '3. Upload the encoded PDF I\'ve attached\n' +
        '4. Enter the secret key above\n' +
        '5. Click "Decode" to reveal the hidden message\n\n' +
        '⚠️ Important: Use the exact PDF file attached. Don\'t modify it or the hidden data will be lost.\n\n' +
        '— Sent via Steganography Tool'
    );

    const gmailURL = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
    window.open(gmailURL, '_blank');
    showStatus('Gmail compose window opened! Attach the encoded PDF and hit Send.', 'success');
}

// ─── DECODE (PDF) ─────────────────────────────────────────────────────────────
function decodePDF() {
    clearStatus();
    document.getElementById('pdfDecodeText').value = '';
    const fileInput  = document.getElementById('decodePDF');
    const enteredKey = document.getElementById('pdfDecodeKey').value;

    if (!fileInput.files[0]) return showStatus('Please select an encoded PDF file.', 'error');
    if (!enteredKey.trim())  return showStatus('Please enter the Secret Key to unlock the message.', 'error');

    const reader = new FileReader();
    reader.onload = function (e) {
        const allBytes = new Uint8Array(e.target.result);

        // Search for our separator byte (0x00) followed by 4-byte length header
        // We search from the end for efficiency (appended data is at the tail)
        // Strategy: find the last 0x00 that is followed by valid data
        // Since 0x00 can appear in PDF, we try to find the correct position
        // by checking if the magic header is present after extracting bits.

        let found = false;

        // Try positions from near the end going backward
        // The separator is after the original PDF, so we search from the last 5 bytes onward
        // Minimum trailer size: 1 (sep) + 4 (header) + 1 (at least 1 byte packed) = 6
        for (let sepIdx = allBytes.length - 6; sepIdx >= 0; sepIdx--) {
            if (allBytes[sepIdx] !== 0x00) continue;

            // Try reading 4-byte bit count at sepIdx+1
            const headerStart = sepIdx + 1;
            if (headerStart + 4 > allBytes.length) continue;

            const dv       = new DataView(allBytes.buffer, allBytes.byteOffset + headerStart, 4);
            const bitCount = dv.getUint32(0, false);

            if (bitCount === 0) continue;
            const packedLen = Math.ceil(bitCount / 8);
            const dataStart = headerStart + 4;

            if (dataStart + packedLen > allBytes.length) continue;

            // Unpack bits
            let binStr = '';
            for (let i = 0; i < bitCount; i++) {
                const byteIdx = i >> 3;
                const bitPos  = 7 - (i & 7);
                binStr += ((allBytes[dataStart + byteIdx] >> bitPos) & 1).toString();
            }

            // Decode binary string to text
            let text = '';
            for (let i = 0; i + 7 < binStr.length; i += 8) {
                text += String.fromCharCode(parseInt(binStr.substring(i, i + 8), 2));
            }

            // Verify magic header
            if (!text.startsWith(PDF_MAGIC)) continue;

            // Strip magic
            text = text.slice(PDF_MAGIC.length);

            // Strip delimiter
            const delimIdx = text.indexOf(DELIMITER);
            if (delimIdx === -1) continue;
            const full = text.slice(0, delimIdx);

            // ── Key verification ─────────────────────────────────────────
            const sepPos = full.indexOf(KEY_SEPARATOR);
            if (sepPos === -1) {
                // Old encoded PDF (no key embedded) — block it
                showStatus('❌ This PDF has no key protection. It may have been encoded without a key.', 'error');
                found = true;
                break;
            }
            const storedKey = full.slice(0, sepPos);
            const message   = full.slice(sepPos + KEY_SEPARATOR.length);

            if (storedKey !== enteredKey) {
                showStatus('🔐 Wrong Secret Key! Access denied.', 'error');
                found = true;
                break;
            }
            // ─────────────────────────────────────────────────────────────

            document.getElementById('pdfDecodeText').value = message;
            showStatus(
                message.length > 0
                    ? '✅ Hidden message extracted from PDF successfully!'
                    : 'PDF decoded but the message was empty.',
                'success'
            );
            found = true;
            break;
        }

        if (!found) {
            showStatus('No hidden message found in this PDF. Make sure it was encoded with this tool.', 'error');
        }
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}