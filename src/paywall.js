// FAKE paywall. No payments, no accounts, no data collected.
// Real version: replace isPro/unlock/reset internals with Stripe Checkout + server-side
// entitlement verification. A client-side flag is trivially bypassed; fine for the fake only.
const KEY = 'pro';
const store = () => { try { return globalThis.localStorage; } catch { return undefined; } };

export const isPro = () => store()?.getItem(KEY) === 'true';

// Fake checkout: short delay, then flag on. `delay` is overridable for tests.
export async function unlock(delay = 1200) {
  await new Promise((r) => setTimeout(r, delay));
  const s = store();
  if (!s) return false; // storage blocked: cannot remember entitlement
  s.setItem(KEY, 'true');
  return true;
}

export const reset = () => { store()?.removeItem(KEY); };

export const PRICE_LABEL = '$4.99/mo'; // display only
const FEATURES = [
  'Scientific functions and angle modes', 'Constants and complex numbers',
  'Graphing with zoom, pan and trace', 'Matrices, statistics and equation solver',
  'Unit and base conversion', 'Unlimited history with CSV export', 'Custom variables and functions',
];

// Upgrade modal. `onChange` runs after unlock so the UI can refresh.
export function showUpgrade(feature, onChange = () => {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'upgrade';
  dlg.setAttribute('aria-labelledby', 'up-title');
  dlg.innerHTML = `
    <form method="dialog">
      <h2 id="up-title">Upgrade to Pro</h2>
      <p class="up-sub">${feature ? `<b></b> is a Pro feature.` : 'Unlock everything.'}</p>
      <ul>${FEATURES.map((f) => `<li>${f}</li>`).join('')}</ul>
      <p class="up-price">${PRICE_LABEL}</p>
      <p class="up-note">Demo only. Nothing is charged and no payment details are collected.</p>
      <p class="up-status" role="status" aria-live="polite"></p>
      <div class="up-actions">
        <button value="cancel" class="ghost">Not now</button>
        <button type="button" class="primary" id="up-go">Unlock Pro</button>
      </div>
    </form>`;
  if (feature) dlg.querySelector('b').textContent = feature;
  const go = dlg.querySelector('#up-go');
  const status = dlg.querySelector('.up-status');
  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = 'Unlocking…';
    if (await unlock()) {
      status.textContent = 'Pro unlocked. Enjoy!';
      go.textContent = 'Done';
      onChange();
      setTimeout(() => dlg.close(), 900);
    } else {
      status.textContent = 'Browser storage is blocked, so Pro cannot be saved. Allow site data and retry.';
      go.disabled = false;
      go.textContent = 'Unlock Pro';
    }
  });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
