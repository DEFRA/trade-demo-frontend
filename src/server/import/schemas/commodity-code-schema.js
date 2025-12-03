import Joi from 'joi'

export const commodityCodeSchema = {
  commodityCode: Joi.object({
    'commodity-code': Joi.string().required().messages({
      'string.empty': 'Enter a commodity code',
      'any.required': 'Enter a commodity code'
    }),
    crumb: Joi.string().optional()
  }),
  species: Joi.object({
    species: Joi.string().required().messages({
      'string.empty': 'Select at least one species',
      'any.required': 'Select at least one species'
    }),
    crumb: Joi.string().optional()
  }),
  noOfAnimals: Joi.object({
    noOfAnimals: Joi.number().required().positive().messages({
      'number.required': 'Enter the number of animals',
      'number.positive': 'Enter the number of animals',
      'any.required': 'Enter the number of animals'
    }),
    crumb: Joi.string().optional()
  })
}
