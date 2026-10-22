import { Type, type Static } from '@sinclair/typebox'
import { UserSchema } from '../../lib/schemas.js'

export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 320 }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
})

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 320 }),
  password: Type.String({ minLength: 1, maxLength: 72 }),
})

export const RefreshBodySchema = Type.Object({
  refreshToken: Type.String({ minLength: 20, maxLength: 500 }),
})

export const ForgotPasswordBodySchema = Type.Object({
  email: Type.String({ format: 'email', maxLength: 320 }),
})

export const ResetPasswordBodySchema = Type.Object({
  token: Type.String({ minLength: 20, maxLength: 500 }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
})

export const LogoutBodySchema = Type.Object({
  refreshToken: Type.Optional(Type.String({ minLength: 20, maxLength: 500 })),
})

export const AuthResponseSchema = Type.Object({
  user: UserSchema,
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresIn: Type.String(),
})

export const ForgotPasswordResponseSchema = Type.Object({
  message: Type.String(),
  resetToken: Type.Optional(Type.String()),
})

export type RegisterBody = Static<typeof RegisterBodySchema>
export type LoginBody = Static<typeof LoginBodySchema>
export type RefreshBody = Static<typeof RefreshBodySchema>
export type ForgotPasswordBody = Static<typeof ForgotPasswordBodySchema>
export type ResetPasswordBody = Static<typeof ResetPasswordBodySchema>
export type LogoutBody = Static<typeof LogoutBodySchema>
