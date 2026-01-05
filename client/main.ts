console.log('Client script loaded');

window.addEventListener('moud:custom', (event) => {
  console.log('Received custom event:', event.detail);
});
