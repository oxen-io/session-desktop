# fetching details about the session release


VERSION_WITH_V=`hub release --exclude-prereleases -L 1`
VERSION_WITHOUT_V=`echo ${VERSION_WITH_V} | sed 's/^v//'`
RELEASE_CONTENT=`hub release show ${VERSION_WITH_V}`
RELEASE_PUBLISHED_DATE=`hub release show ${VERSION_WITH_V} -f "%pI" | cut -c1-10`
DEB_NAME=`echo session-messenger-desktop-linux-amd64-${VERSION_WITHOUT_V}.deb`
DEB_SHA=`echo -n "${RELEASE_CONTENT}" | grep ${DEB_NAME} | cut -f2- -d' ' | tr -d '\r'`


# fake
# DEB_SHA="fake-DEB_SHA"
# VERSION_WITHOUT_V="fake-VERSION_WITHOUT_V"
# VERSION_WITH_V="fake-VERSION_WITH_V"
# RELEASE_PUBLISHED_DATE="fake-date"

cd ../
# FLATPAK reset
hub clone Bilb/network.loki.Session
cd network.loki.Session
git remote add upstream git@github.com:flathub/network.loki.Session.git
git fetch upstream
git reset --hard upstream/master


# JSON FILE UPDATE
JSON_FILE='network.loki.Session.json'
JSON_CONTENT=`cat ${JSON_FILE}`
JSON_UPDATED_WITH_VERSION=`echo "${JSON_CONTENT}" | sed "s|session-desktop/releases/download/.*|session-desktop/releases/download/$VERSION_WITH_V/session-messenger-desktop-linux-amd64-$VERSION_WITHOUT_V.deb\",|"`
JSON_UPDATED_WITH_SHA=`echo "${JSON_UPDATED_WITH_VERSION}" | sed "s|\"sha256\": \".*|\"sha256\": \"$DEB_SHA\"|"`

echo -n "${JSON_UPDATED_WITH_SHA}" > ${JSON_FILE}

# XML FILE UPDATE
XML_FILE='network.loki.Session.metainfo.xml'
XML_CONTENT=`cat ${XML_FILE}`
TAG_URL="https://github.com/loki-project/session-desktop/releases/tag/$VERSION_WITH_V"
XML_TO_INSERT="<release version=\"$VERSION_WITHOUT_V\" date=\"$RELEASE_PUBLISHED_DATE\">\n      <url>$TAG_URL</url>\n    </release>"

XML_UPDATED_WITH_RELEASE=`echo "$XML_CONTENT" | sed '/<releases>/ a '"$XML_TO_INSERT"''`
XML_UPDATED_WITH_SPACES=`echo "$XML_UPDATED_WITH_RELEASE" | sed 's/^<release/    <release/'`
echo  "${XML_UPDATED_WITH_SPACES}" > ${XML_FILE}


# Create commit and PR
git add .
git commit -m "Update to $VERSION_WITH_V"
git push origin master -f
# hub pull-request --no-edit