const isLocalDev = process.env.REACT_APP_LOCAL_DEV === 'true';
const awsRegion = process.env.REACT_APP_AWS_REGION;
const websiteUrl = process.env.REACT_APP_WEBSITE_URL;
const stage = process.env.REACT_APP_STAGE;
const region = process.env.REACT_APP_REGION;
const appClientId = process.env.REACT_APP_APP_CLIENT_ID;
const buildDate = process.env.REACT_APP_BUILD_DATE;
const buildId = process.env.REACT_APP_BUILD_ID

const branding = {
  login: {
    title: process.env.REACT_APP_BRAND_LOGIN_TITLE,
    subtitle: process.env.REACT_APP_BRAND_LOGIN_SUBTITLE,
  },
  main: {
    title: process.env.REACT_APP_BRAND_MAIN_TITLE,
  },
  page: {
    title: process.env.REACT_APP_BRAND_PAGE_TITLE,
  },
};

export { awsRegion, isLocalDev, websiteUrl, stage, region, appClientId, branding, buildDate, buildId };
