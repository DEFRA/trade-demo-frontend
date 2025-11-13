import Joi from 'joi'

export const purposeSchema = Joi.object({
  purpose: Joi.string()
    .valid('internalmarket', 're-entry')
    .required()
    .messages({
      'string.empty': 'Select the main reason for importing the animals',
      'any.required': 'Select the main reason for importing the animals',
      'any.only': 'Select a valid reason for importing the animals'
    }),
  'internal-market-purpose': Joi.string().when('purpose', {
    is: 'internalmarket',
    then: Joi.string().required().messages({
      'string.empty': 'Select what the animals are for',
      'any.required': 'Select what the animals are for'
    }),
    otherwise: Joi.string().optional().allow('', null)
  }),
  crumb: Joi.string().optional()
})
