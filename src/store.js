import { reactive } from 'vue'
import { activateGuestMode, deactivateGuestMode, getGuestState } from './guestMode.mjs'

export const globalState = reactive({
  isDrawerOpen: false,
  authReady: false,
  currentUser: null,
  isGuest: getGuestState().active
})

export const setCurrentUser = (user) => {
  globalState.currentUser = user
  globalState.authReady = true
  if (user) {
    deactivateGuestMode()
    globalState.isGuest = false
  }
}

export const enterGuestMode = () => {
  activateGuestMode()
  globalState.isGuest = true
  globalState.authReady = true
}

export const leaveGuestMode = () => {
  deactivateGuestMode()
  globalState.isGuest = false
}
