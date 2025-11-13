import Joi from 'joi'

export const reviewSchema = Joi.object({
  confirmAccurate: Joi.string().valid('true').required().messages({
    'any.only':
      'Confirm that the information you have provided is correct to the best of your knowledge',
    'any.required':
      'Confirm that the information you have provided is correct to the best of your knowledge',
    'string.base':
      'Confirm that the information you have provided is correct to the best of your knowledge'
  }),
  crumb: Joi.string().optional()
})
