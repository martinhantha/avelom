require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'AvelomCapacitorCallHints'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'UNLICENSED'
  s.homepage = 'https://avelom.app'
  s.author = 'Avelom'
  s.source = { :git => 'https://github.com/avelom/avelom.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/CallHintsPlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.9'
end
