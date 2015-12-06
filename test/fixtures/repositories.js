module.exports = [
  {
    givenParam: 'ssh://user@host.xz:8080/path/to/repo.git',
    repoFullName: 'ssh://user@host.xz:8080/path/to/repo.git',
    repoName: 'repo'
  },
  {
    givenParam: 'ssh://host.xz/path/repo.git',
    repoFullName: 'ssh://host.xz/path/repo.git',
    repoName: 'repo'
  },
  {
    givenParam: 'git://host.xz:1234/path/to/repo.git/',
    repoFullName: 'git://host.xz:1234/path/to/repo.git/',
    repoName: 'repo'
  },
  {
    givenParam: 'host.xz:path/to/repo',
    repoFullName: 'host.xz:path/to/repo',
    repoName: 'repo'
  },
  {
    givenParam: 'user@host.xz:path/to/repo/',
    repoFullName: 'user@host.xz:path/to/repo/',
    repoName: 'repo'
  },
  {
    givenParam: 'tj/commander.js.git',
    repoFullName: 'git@github.com:tj/commander.js.git',
    repoName: 'commander.js'
  },
  {
    givenParam: 'commander.js.git',
    repoFullName: 'git@github.com:orga/commander.js.git',
    repoName: 'commander.js'
  },
  {
    givenParam: 'commander.js',
    repoFullName: 'git@github.com:orga/commander.js.git',
    repoName: 'commander.js'
  }
];
