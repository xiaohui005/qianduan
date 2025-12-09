/**
 * 二维码生成工具模块
 * 依赖于 qrcode.js 库 (假设已通过 CDN 或本地引入)
 *
 * 注意: 由于项目是原生JS, 我们需要一个纯JS的二维码生成库。
 * 假设在 index.html 中已引入 qrcode.min.js:
 * <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
 */

// 检查 qrcode 库是否已加载
if (typeof QRCode === 'undefined') {
  console.error("QRCode 库未加载。请确保在 index.html 中引入 qrcode.min.js。");
}

/**
 * 生成二维码并插入到指定的DOM元素中
 * @param {string} text - 要编码的文本内容 (即推荐号码字符串)
 * @param {HTMLElement} element - 插入二维码的DOM元素
 * @param {number} [size=128] - 二维码的尺寸 (像素)
 */
function generateQRCode(text, element, size = 128) {
  if (typeof QRCode === 'undefined') {
    console.error("无法生成二维码: QRCode 库未加载。");
    return;
  }

  // 清空容器，防止重复生成
  element.innerHTML = '';

  // 确保文本内容不为空
  if (!text) {
    element.innerHTML = '<p style="color: red;">内容为空</p>';
    return;
  }

  try {
    new QRCode(element, {
      text: text,
      width: size,
      height: size,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (error) {
    console.error("生成二维码失败:", error);
    element.innerHTML = '<p style="color: red;">生成失败</p>';
  }
}

// 导出函数
window.generateQRCode = generateQRCode;

console.log('✅ 二维码工具模块已加载');
