
// popup-loader.js
document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.getElementById('app');
  const loader = document.getElementById('loader');
  
  iframe.onload = function() {
    setTimeout(function() {
      loader.style.display = 'none';
      iframe.style.display = 'block';
    }, 1000);
  };
  
  // Fallback
  setTimeout(function() {
    if (iframe.style.display === 'none') {
      const button = document.createElement('button');
      button.textContent = 'Abrir em Nova Aba';
      button.style.cssText = 'padding: 10px 20px; font-size: 16px; cursor: pointer; background: white; border: none; border-radius: 5px;';
      button.onclick = function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      };
      loader.innerHTML = '';
      loader.appendChild(button);
    }
  }, 5000);
});
