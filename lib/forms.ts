import { isAddress } from 'ethers';

export type SupportedChain = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';
export type SupportedCurrency = 'EUR' | 'USD';

export interface WalletFormData {
  walletAddress: string;
  blockchain: SupportedChain;
  currency: SupportedCurrency;
  email: string;
}

export function validateWalletAddress(address: string): { valid: boolean; error?: string } {
  if (!address) {
    return { valid: false, error: 'Wallet address is required' };
  }
  
  if (!address.startsWith('0x')) {
    return { valid: false, error: 'Wallet address must start with 0x' };
  }
  
  if (!isAddress(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' };
  }
  
  return { valid: true };
}

export function validateBlockchain(blockchain: string): { valid: boolean; error?: string } {
  const supportedChains: SupportedChain[] = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
  
  if (!blockchain) {
    return { valid: false, error: 'Blockchain is required' };
  }
  
  if (!supportedChains.includes(blockchain as SupportedChain)) {
    return { valid: false, error: 'Unsupported blockchain' };
  }
  
  return { valid: true };
}

export function validateCurrency(currency: string): { valid: boolean; error?: string } {
  const supportedCurrencies: SupportedCurrency[] = ['EUR', 'USD'];
  
  if (!currency) {
    return { valid: false, error: 'Currency is required' };
  }
  
  if (!supportedCurrencies.includes(currency as SupportedCurrency)) {
    return { valid: false, error: 'Unsupported currency. Only EUR and USD are supported' };
  }
  
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

export function validateWalletForm(data: WalletFormData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  
  const walletValidation = validateWalletAddress(data.walletAddress);
  if (!walletValidation.valid) {
    errors.walletAddress = walletValidation.error || 'Invalid wallet address';
  }
  
  const blockchainValidation = validateBlockchain(data.blockchain);
  if (!blockchainValidation.valid) {
    errors.blockchain = blockchainValidation.error || 'Invalid blockchain';
  }
  
  const currencyValidation = validateCurrency(data.currency);
  if (!currencyValidation.valid) {
    errors.currency = currencyValidation.error || 'Invalid currency';
  }
  
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error || 'Invalid email';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}