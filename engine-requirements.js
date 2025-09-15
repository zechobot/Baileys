const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 20) {
  console.error(
  `\n❌ Paket ini memerlukan Node.js versi 20+ agar dapat berjalan dengan baik.\n` +
  `   Saat ini Anda menggunakan Node.js versi ${process.versions.node}.\n` +
  `   Silakan upgrade ke Node.js 20+ untuk melanjutkan.\n`
);
  process.exit(1);
}
