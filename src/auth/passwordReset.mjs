export const buildPasswordResetEmailArgs = (href) => ({
  redirectTo: `${new URL(href).origin}/reset-password`
})

export const validatePasswordUpdate = (password, confirmPassword) => {
  if (!password || password.length < 6) return '新密码至少需要 6 位'
  if (password !== confirmPassword) return '两次输入的密码不一致'
  return ''
}
