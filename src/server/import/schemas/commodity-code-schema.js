import Joi from 'joi'

export const commodityCodeSchema = Joi.object({
  commodityCode: Joi.string().required().messages({
    'string.empty': 'Enter a valid commodity code',
    'any.required': 'Enter a valid commodity code'
  }),
  crumb: Joi.string().optional()
})
