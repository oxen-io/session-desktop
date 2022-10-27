local apt_get_quiet = 'apt-get -o=Dpkg::Use-Pty=0 -q';

// Regular integration_tests on a ubuntu system:
local ubuntu_integration_tests(name,
                      image,
                      arch='amd64',
                      local_mirror=true,
                      jobs=1,
                      ) = {
  kind: 'pipeline',
  type: 'docker',
  name: name,
  platform: { arch: arch },
  trigger: { branch: ['clearnet', 'master', 'test-playwright'] } ,
  steps: [
{
      name: 'Install, build and test',
      image: image,
      pull: 'always',
      environment: { SSH_KEY: { from_secret: 'SSH_KEY' } },
      commands: [
                  'echo "Integration tests on ${DRONE_STAGE_MACHINE}"',
                  'echo "man-db man-db/auto-update boolean false" | debconf-set-selections',
                  apt_get_quiet + ' update',
                ] + [
                  apt_get_quiet + ' dist-upgrade -y',
                  apt_get_quiet + ' install --no-install-recommends -y git build-essential curl make',
                  'cd ~', // because we need to not be in a folder with .nvmrc to source nvm.sh
                  'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash',
                  '. ~/.nvm/nvm.sh',
                  'cd -',
                  'nvm install',
                  'nvm use',
                  'npm install -g yarn',
                  'yarn cache clean',
                  'yarn install --frozen-lockfile',
                  'yarn build-everything',
                  'export RUNNING_IN_CI=1',
                  'xvfb-run yarn integration-test',
                ]
    },

  ],
};


[
  ubuntu_integration_tests('Ubuntu Focal', 'mcr.microsoft.com/playwright:v1.27.0-focal'),
]
