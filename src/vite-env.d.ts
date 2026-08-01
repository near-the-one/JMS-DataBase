/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.ts?url' {
  const url: string;
  export default url;
}

declare module '*.ts?worker' {
  const workerUrl: string;
  export default workerUrl;
}