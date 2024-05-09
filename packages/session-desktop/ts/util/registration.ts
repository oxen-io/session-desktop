
async function markDone() {
  await window.Storage.put('chromiumRegistrationDoneEver', '');
  await window.Storage.put('chromiumRegistrationDone', '');
}
function isDone() {
  return window.Storage.get('chromiumRegistrationDone') === '';
}
function everDone() {
  return (
    window.Storage.get('chromiumRegistrationDoneEver') === '' ||
    window.Storage.get('chromiumRegistrationDone') === ''
  );
}
async function remove() {
  await window.Storage.remove('chromiumRegistrationDone');
}

export const Registration = { markDone, isDone, everDone, remove };
