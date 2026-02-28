export function syncStarted() {
  return { title: "Sync started." };
}

export function syncFailed() {
  return { title: "Sync failed.", description: "Try again." };
}

export function actionSaved() {
  return { title: "Saved." };
}

export function actionSaveFailed() {
  return { title: "Couldn’t save.", description: "Try again." };
}

export function aiFailed() {
  return { title: "AI failed to respond.", description: "Try again." };
}
