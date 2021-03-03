import React from 'react';

import VersionPage from '../pages/versionpage';

export default {
    title: 'Example/Version Page',
    component: VersionPage,
};

const Template = (args) => <VersionPage {...args} />;

export const Base = Template.bind({});
