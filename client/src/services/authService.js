import { request } from './api'

/**
 * Auth Service connecting KisanMitra authentication and OTP endpoints.
 */

export const sendFarmerOtp = async (mobile) => {
  return request('/otp/send/farmer-registration', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  })
}

export const verifyFarmerOtp = async (mobile, otp) => {
  return request('/otp/verify/farmer-registration', {
    method: 'POST',
    body: JSON.stringify({ mobile, otp }),
  })
}

export const registerFarmer = async (farmerData) => {
  return request('/auth/register/farmer', {
    method: 'POST',
    body: JSON.stringify(farmerData),
  })
}

export const registerBuyer = async (buyerData) => {
  return request('/auth/register/buyer', {
    method: 'POST',
    body: JSON.stringify(buyerData),
  })
}

export const loginUser = async (credentials) => {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export default {
  sendFarmerOtp,
  verifyFarmerOtp,
  registerFarmer,
  registerBuyer,
  loginUser,
}
