-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
