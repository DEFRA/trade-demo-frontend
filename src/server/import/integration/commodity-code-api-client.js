import { config } from '../../../config/config.js'
import { GET } from './http_client.js'

const tracingHeader = config.get('tracing.header')
const commodityCodeBaseUrl = config.get('services.commodityCode.baseUrl')

export const commodityCodeApi = {
  /**
   * Get commodity by Code
   * @param {string} commodityCode - commodityCode ID
   * @param {string} traceId - Request trace ID
   * @returns {Promise<object>} Example object
   */
  async findCommodityByCode(commodityCode, traceId) {
    const response = await GET({
      url: `${commodityCodeBaseUrl}/commodity-codes/CVEDA/commodity-code/${commodityCode}`,
      headers: {
        [tracingHeader]: traceId
      }
    })

    return response
  },

  async getCommodityCategory(commodityCode, traceId) {
    const response = await GET({
      url: `${commodityCodeBaseUrl}/commodity-categories/CVEDA-${commodityCode}`,
      headers: {
        [tracingHeader]: traceId
      }
    })

    return response
  },

  async getTopLevelCommodityTree(certType, traceId) {
    const response = await GET({
      url: `${commodityCodeBaseUrl}/commodity-codes/CVEDA/top-level`,
      headers: {
        [tracingHeader]: traceId
      }
    })

    return response
  },

  async getByParentCode(certType, parentCode, traceId) {
    const response = await GET({
      url: `${commodityCodeBaseUrl}/commodity-codes/CVEDA/parent-code/${parentCode}`,
      headers: {
        [tracingHeader]: traceId
      }
    })

    return response
  },

  async getAllParents(certType, commodityCode, traceId) {
    const response = await GET({
      url: `${commodityCodeBaseUrl}/commodity-codes/CVEDA/all-parents/${commodityCode}`,
      headers: {
        [tracingHeader]: traceId
      }
    })

    return response
  }
}
