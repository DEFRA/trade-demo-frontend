import Joi from 'joi'

export const originSchema = Joi.object({
  'origin-country': Joi.string().required().messages({
    'string.empty':
      'Select the country where the animal or product originates from',
    'any.required':
      'Select the country where the animal or product originates from'
  }),
  crumb: Joi.string().optional()
})
