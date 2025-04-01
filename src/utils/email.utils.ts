import nodemailer from "nodemailer";

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "이메일 인증을 완료해주세요",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>이메일 인증</h2>
        <p>안녕하세요! 회원가입해 주셔서 감사합니다.</p>
        <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">이메일 인증하기</a>
        <p>또는 다음 링크를 브라우저에 복사하여 붙여넣으세요:</p>
        <p>${verificationUrl}</p>
        <p>이 링크는 24시간 동안 유효합니다.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
