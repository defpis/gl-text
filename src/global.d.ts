declare const STYLES: { [k: string]: string };
declare const IMPORT_URL: string;

declare module "*.css" {
  export default STYLES;
}

declare module "*.scss" {
  export default STYLES;
}

declare module "*.ttf" {
  export default IMPORT_URL;
}
