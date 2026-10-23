import './styles.css';

const form = document.querySelector('#nicknameForm');
const nameInput = document.querySelector('#nameInput');
const nicknameElement = document.querySelector('#nickname');
const copyButton = document.querySelector('#copyButton');
const hint = document.querySelector('#hint');

function makeNickname() {
  return 'matts wittle kitten';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  nicknameElement.textContent = makeNickname(name);
  copyButton.hidden = false;
  hint.textContent = 'Not feeling it? Change your name slightly and try again.';
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(nicknameElement.textContent);
    copyButton.textContent = 'Copied!';
    window.setTimeout(() => { copyButton.textContent = 'Copy nickname'; }, 1400);
  } catch {
    copyButton.textContent = 'Select to copy';
  }
});
