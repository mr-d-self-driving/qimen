export const buildGoogleOAuthSignInArgs = (href) => ({
  provider: 'google',
  options: {
    redirectTo: new URL(href).origin
  }
})
