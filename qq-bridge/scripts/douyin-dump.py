"""Fresh hierarchy only; never falls back to a previous device file."""
import sys
import time
import re
import xml.etree.ElementTree as ET
import uiautomator2 as u2
sys.stdout.reconfigure(encoding='utf-8')
for attempt in range(3):
    try:
        device=u2.connect(sys.argv[1])
        device.jsonrpc.setConfigurator({'waitForIdleTimeout':0,'waitForSelectorTimeout':0})
        xml=device.dump_hierarchy(compressed=False,max_depth=70)
        if '<node' not in xml or '</hierarchy>' not in xml:
            raise RuntimeError('Empty or incomplete live UI hierarchy')
        # Douyin transiently omits its back button's accessibility label. The
        # observed pwc container is the stable back control, not a guessed point.
        root=ET.fromstring(xml)
        nodes=list(root.iter('node'))
        prefix='com.ss.android.ugc.aweme:id/'
        titles=[n for n in nodes if n.get('resource-id')==prefix+'vws']
        back=[n for n in nodes if n.get('resource-id')==prefix+'pwc' and n.get('bounds')=='[0,108][128,236]']
        labeled=[n for n in nodes if n.get('clickable')=='true' and re.fullmatch(r'(?:返回(?:未读\d+条消息)?|关闭)',n.get('content-desc','')) and n.get('bounds','').startswith('[0,')]
        if len(titles)==1 and len(back)==1 and not labeled:
            back[0].set('content-desc','返回')
            back[0].set('clickable','true')
            xml=ET.tostring(root,encoding='unicode')
        print(xml)
        break
    except Exception as error:
        if attempt==2:
            raise SystemExit('Live UI read failed: '+type(error).__name__+': '+str(error))
        time.sleep(.7)
