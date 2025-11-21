import axios from 'axios'

export const axiosFactory = {
  getInstance() {
    return axios.create({
      timeout: 5000
    })
  }
}
