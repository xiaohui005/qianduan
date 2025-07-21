import pandas as pd
 
def simple_analysis(df: pd.DataFrame):
    # 示例：返回每列的唯一值数量
    return df.nunique().to_dict() 