-- AlterTable
-- birthDate passa a guardar ciphertext (TEXT). O USING converte os valores
-- existentes (timestamps) em texto; ficam como "legado em texto claro" e são
-- lidos normalmente (decryptField tolera valor sem prefixo v1:) até serem
-- reescritos, quando passam a ser cifrados.
ALTER TABLE "Patient" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT,
ALTER COLUMN "birthDate" SET DATA TYPE TEXT USING "birthDate"::text;
