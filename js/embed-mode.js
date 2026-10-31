/**
 * Standalone page only: when the page is loaded inside an iframe (GoDaddy
 * embed), drop the page background/padding so the host page frames it.
 */
let embedded = false;
try {
  embedded = window.self !== window.top;
} catch {
  embedded = true;
}
if (embedded) document.body.classList.add('dvn-embedded');
