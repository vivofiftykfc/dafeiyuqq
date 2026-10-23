"""Generation-only attribution: delivery proves an utterance, not its truth."""
import copy,re

def annotate_history(history):
    result=[]
    for source in history:
        row=copy.deepcopy(source)
        speaker=row.get('speaker');text=str(row.get('text',''))
        if speaker=='assistant':
            kind='assistant_utterance_not_independent_evidence_about_user'
        elif speaker=='user':
            visual=row.get('modality')=='image' or bool(re.match(r'^\[(?:图片|用户当时发送的图片|当前收到的图片观察结果)',text))
            kind='user_shared_image_not_a_personal_statement' if visual else 'user_statement_with_original_attribution'
        else:kind='observation_or_tool_result_not_user_speech'
        # This field is derived by code; never accept an inherited certainty label.
        row['grounding']=kind
        result.append(row)
    return result
