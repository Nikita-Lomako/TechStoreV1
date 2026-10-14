import { Type } from '@sinclair/typebox'

export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any()),
  }),
})

export const RoleSchema = Type.Union([Type.Literal('customer'), Type.Literal('admin')])

export const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  role: RoleSchema,
  createdAt: Type.String({ format: 'date-time' }),
})

export const MessageResponseSchema = Type.Object({
  message: Type.String(),
})
