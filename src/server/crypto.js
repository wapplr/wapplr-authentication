import crypto from "crypto";

export default function getCrypto(p = {}) {

    const {
        algorithm = "aes-192-cbc",
        password = "Password used to generate key"
    } = p;

    return {
        encrypt: function (text) {
            const key = crypto.scryptSync(password, "salt", 24);
            const iv = Buffer.alloc(16, 0);
            const cipher = crypto.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(text, "utf8", "hex");
            encrypted += cipher.final("hex");
            return encrypted;
        },
        decrypt: function (encrypted) {
            const key = crypto.scryptSync(password, "salt", 24);
            const iv = Buffer.alloc(16, 0);
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, "hex", "utf8");
            decrypted += decipher.final("utf8");
            return decrypted;
        }
    }

}
