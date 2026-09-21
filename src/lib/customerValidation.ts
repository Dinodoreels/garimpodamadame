import { z } from 'zod';

const digits = (value: string) => value.replace(/\D/g, '');

export function isValidCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return Number(cpf[length]) === (remainder === 10 ? 0 : remainder);
  };
  return check(9) && check(10);
}

export const customerAddressSchema = z.object({
  label: z.string().trim().min(2, 'Informe um nome para o endereço').max(40),
  recipient_name: z.string().trim().min(3, 'Informe o nome completo').max(120),
  phone: z.string().transform(digits).refine((value) => value.length >= 10 && value.length <= 11, 'Telefone inválido'),
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  birth_date: z.string().refine((value) => {
    const date = new Date(`${value}T12:00:00`);
    const today = new Date();
    return Boolean(value) && !Number.isNaN(date.getTime()) && date < today && date.getFullYear() >= 1900;
  }, 'Data de nascimento inválida'),
  zip_code: z.string().transform(digits).refine((value) => value.length === 8, 'CEP inválido'),
  street: z.string().trim().min(2, 'Informe a rua ou avenida').max(160),
  number: z.string().trim().min(1, 'Informe o número ou marque “Sem número”').max(20),
  complement: z.string().trim().max(120),
  neighborhood: z.string().trim().min(2, 'Informe o bairro').max(100),
  city: z.string().trim().min(2, 'Informe a cidade').max(100),
  state: z.string().length(2, 'Selecione o estado'),
  is_default: z.boolean(),
});
