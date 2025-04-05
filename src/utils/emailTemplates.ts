// 공통 스타일 정의
const commonStyles = {
  container: `
    background-color: #151b33;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
  `,
  content: `
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  `,
  button: `
    background: #3498db;
    color: #ffffff;
    text-decoration: none;
    padding: 12px 30px;
    border-radius: 4px;
    display: inline-block;
    font-weight: bold;
    margin: 20px 0;
  `,
  text: `
    color: #dddfff;
    font-size: 16px;
    line-height: 1.5;
  `,
  footer: `
    color: #666666;
    font-size: 12px;
    text-align: center;
    margin-top: 30px;
  `,
};

// 공통 이메일 레이아웃 템플릿
const getEmailLayout = (content: string) => `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PollPoll</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .content {
        padding: 10px !important;
      }
    }
  </style>
</head>
<body style="${commonStyles.container}">
  <div class="container" style="${commonStyles.content}">
    <div style="text-align: center; margin-bottom: 30px;">
      <img 
        src="${process.env.NEXT_PUBLIC_LOGO_URL || "https://i.postimg.cc/C14Ftg8Q/logo.png"}" 
        alt="PollPoll 로고" 
        style="max-width: 150px; height: auto;"
      />
    </div>
    ${content}
    <div style="${commonStyles.footer}">
      <p>© ${new Date().getFullYear()} PollPoll. All rights reserved.</p>
      <p>이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
    </div>
  </div>
</body>
</html>
`;

// 이메일 인증 템플릿
export const getVerifyEmailTemplate = (url: string) => ({
  subject: "PollPoll - 이메일 주소 인증",
  text: `이메일 주소를 인증하려면 다음 링크를 클릭하세요: ${url}`,
  html: getEmailLayout(`
    <div style="text-align: center;">
      <h1 style="color: #f5f5f5; margin-bottom: 20px;">이메일 주소 인증</h1>
      <p style="${commonStyles.text}">
        PollPoll에 가입해주셔서 감사합니다!<br>
        이메일 주소를 인증하려면 아래 버튼을 클릭하세요.
      </p>
      <a href="${url}" style="${commonStyles.button}">이메일 인증하기</a>
      <p style="${commonStyles.text}">
        버튼이 작동하지 않는 경우, 다음 링크를 복사하여 브라우저에 붙여넣으세요:<br>
        <span style="word-break: break-all;">${url}</span>
      </p>
    </div>
  `),
});

// 비밀번호 재설정 템플릿
export const getPasswordResetTemplate = (url: string) => ({
  subject: "PollPoll - 비밀번호 재설정 요청",
  text: `비밀번호를 재설정하려면 다음 링크를 클릭하세요: ${url}`,
  html: getEmailLayout(`
    <div style="text-align: center;">
      <h1 style="color: #f5f5f5; margin-bottom: 20px;">비밀번호 재설정</h1>
      <p style="${commonStyles.text}">
        비밀번호 재설정을 요청하셨습니다.<br>
        아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
      </p>
      <a href="${url}" style="${commonStyles.button}">비밀번호 재설정</a>
      <p style="${commonStyles.text}">
        버튼이 작동하지 않는 경우, 다음 링크를 복사하여 브라우저에 붙여넣으세요:<br>
        <span style="word-break: break-all;">${url}</span>
      </p>
      <p style="${commonStyles.text}">
        이 요청을 하지 않았다면, 이 이메일을 무시하세요.
      </p>
    </div>
  `),
});
