/**
 * 二维码工具
 * - 动态按需加载 qrcode.js（若页面未预加载）
 * - 提供单个 / 批量渲染方法
 *
 * 用法：
 *   QRTool.render(elementOrId, text, size?)
 *   QRTool.renderBatch([{ id, element, text, size }], defaultSize?)
 */
(function(global) {
  const CDN_SRC = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  let libPromise = null;

  function ensureLib() {
    if (global.QRCode) return Promise.resolve();
    if (!libPromise) {
      libPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = CDN_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('二维码库加载失败'));
        document.head.appendChild(script);
      });
    }
    return libPromise;
  }

  function render(target, text, size = 96, options = {}) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) {
      console.warn('QRTool.render: 未找到目标元素', target);
      return;
    }
    ensureLib()
      .then(() => {
        el.innerHTML = '';
        new global.QRCode(el, {
          text: text || '',
          width: size,
          height: size,
          correctLevel: global.QRCode.CorrectLevel.M,
          ...options
        });
      })
      .catch(err => console.error('二维码生成失败', err));
  }

  function renderBatch(entries, defaultSize = 96, options = {}) {
    if (!entries || entries.length === 0) return;
    ensureLib()
      .then(() => {
        entries.forEach(({ id, element, text, size }) => {
          const el = element || (id ? document.getElementById(id) : null);
          if (!el) return;
          el.innerHTML = '';
          new global.QRCode(el, {
            text: text || '',
            width: size || defaultSize,
            height: size || defaultSize,
            correctLevel: global.QRCode.CorrectLevel.M,
            ...options
          });
        });
      })
      .catch(err => console.error('二维码生成失败', err));
  }

  function attachToggle(button, container, text, size = 96, labels = {}) {
    const btn = typeof button === 'string' ? document.getElementById(button) : button;
    const box = typeof container === 'string' ? document.getElementById(container) : container;
    if (!btn || !box) {
      console.warn('QRTool.attachToggle: 元素不存在');
      return;
    }
    const showLabel = labels.show || '显示二维码';
    const hideLabel = labels.hide || '隐藏二维码';
    btn.dataset.qrVisible = '0';
    btn.textContent = showLabel;

    btn.addEventListener('click', () => {
      const visible = btn.dataset.qrVisible === '1';
      if (visible) {
        box.style.display = 'none';
        btn.dataset.qrVisible = '0';
        btn.textContent = showLabel;
      } else {
        box.style.display = 'inline-flex';
        if (!box.dataset.qrRendered) {
          render(box, text, size);
          box.dataset.qrRendered = '1';
        }
        btn.dataset.qrVisible = '1';
        btn.textContent = hideLabel;
      }
    });

    box.style.display = 'none';
  }

  function initAutoToggles(root = document) {
    const containers = root.querySelectorAll('[data-qr-text]:not([data-qr-ready="1"])');
    containers.forEach(container => {
      const text = container.dataset.qrText || '';
      if (!text) {
        container.dataset.qrReady = '1';
        return;
      }
      const size = parseInt(container.dataset.qrSize || '96', 10);
      const showLabel = container.dataset.qrShow || '显示二维码';
      const hideLabel = container.dataset.qrHide || '隐藏二维码';
      const btnClass = container.dataset.qrBtnClass || 'btn btn-secondary qr-toggle-btn';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = btnClass;
      btn.textContent = showLabel;
      container.parentNode.insertBefore(btn, container);

      attachToggle(btn, container, text, size, { show: showLabel, hide: hideLabel });
      container.dataset.qrReady = '1';
    });
  }

  global.QRTool = { ensureLib, render, renderBatch, attachToggle, initAutoToggles };

  // 向后兼容旧的全局方法
  global.generateQRCode = function(text, element, size = 96) {
    render(element, text, size);
  };

  global.QRTool.attachToggle = attachToggle;
  global.QRTool.initAutoToggles = initAutoToggles;

  console.log('QRTool ready');
})(window);
