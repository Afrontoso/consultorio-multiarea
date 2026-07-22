// Chave determinística para os testes que exercem a criptografia de campos
// (field-crypto). 32 bytes em base64.
process.env.FIELD_ENCRYPTION_KEY =
  process.env.FIELD_ENCRYPTION_KEY ?? 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
