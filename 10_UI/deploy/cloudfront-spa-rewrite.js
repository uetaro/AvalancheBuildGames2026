/**
 * CloudFront Function — SPA Routing Rewrite
 *
 * S3 has no notion of client-side routing, so paths like /staff/stays return 404.
 * This function rewrites to the appropriate index.html per app subpath.
 *
 * Register in CloudFront > Functions > Create function, then attach to
 * Distribution > Behaviors > Viewer request.
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Pass through file requests (with extension)
  if (uri.match(/\.\w+$/)) {
    return request;
  }

  // SPA routing per app
  if (uri.startsWith('/staff-mobile')) {
    request.uri = '/staff-mobile/index.html';
  } else if (uri.startsWith('/guest-mobile')) {
    request.uri = '/guest-mobile/index.html';
  } else {
    request.uri = '/index.html';
  }

  return request;
}
