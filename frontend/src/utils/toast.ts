import { UseToastOptions } from '@chakra-ui/react'

type ToastFn = (options: UseToastOptions) => void

export function showSuccessToast(toast: ToastFn, title: string, description: string) {
  toast({ title, description, status: 'success', duration: 3000, isClosable: true })
}

export function showErrorToast(toast: ToastFn, title: string, description: string) {
  toast({ title, description, status: 'error', duration: 5000, isClosable: true })
}

export function showInfoToast(toast: ToastFn, title: string, description: string) {
  toast({ title, description, status: 'info', duration: 3000, isClosable: true })
}

export function showWarningToast(toast: ToastFn, title: string, description: string) {
  toast({ title, description, status: 'warning', duration: 3000, isClosable: true })
}
